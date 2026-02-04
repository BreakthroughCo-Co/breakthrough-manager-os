import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { client_id } = await req.json();

    const [client, goals, caseNotes, bsp, interventions, riskProfile, feedback, outcomePrediction] = await Promise.all([
      base44.asServiceRole.entities.Client.get(client_id),
      base44.asServiceRole.entities.ClientGoal.filter({ client_id }),
      base44.asServiceRole.entities.CaseNote.filter({ client_id }),
      base44.asServiceRole.entities.BehaviourSupportPlan.filter({ client_id, status: 'active' }).then(p => p[0]).catch(() => null),
      base44.asServiceRole.entities.ABCRecord.filter({ client_id }),
      base44.asServiceRole.entities.ClientRiskProfile.filter({ client_id }).then(p => p[0]).catch(() => null),
      base44.asServiceRole.entities.ClientFeedback.filter({ client_id }),
      base44.asServiceRole.entities.Client.get(client_id).then(() => null).catch(() => null)
    ]);

    const recentNotes = caseNotes
      .sort((a, b) => new Date(b.session_date) - new Date(a.session_date))
      .slice(0, 10);

    const effectiveInterventions = {};
    recentNotes.forEach(note => {
      if (note.interventions_used) {
        note.interventions_used.split(',').forEach(intervention => {
          const int = intervention.trim();
          if (!effectiveInterventions[int]) effectiveInterventions[int] = { count: 0, effectiveness: 0 };
          effectiveInterventions[int].count++;
          if (note.progress_rating === 'progressing' || note.progress_rating === 'achieved') {
            effectiveInterventions[int].effectiveness++;
          }
        });
      }
    });

    const goalProgress = goals.map(g => ({
      goal: g.goal_description,
      current_progress: g.current_progress || 0,
      target_date: g.target_date,
      status: g.status,
      barriers: []
    }));

    const prompt = `
You are designing dynamic, evidence-based intervention pathways for NDIS client goal achievement.

CLIENT PROFILE:
- Name: ${client.full_name}
- Service Type: ${client.service_type}
- Risk Level: ${riskProfile?.overall_risk_level || 'medium'}
- Current BSP Focus: ${bsp?.primary_target_behaviors || 'General support'}

GOAL ACHIEVEMENT TARGETS:
${goalProgress.map(g => `- ${g.goal}: ${g.current_progress}% complete (Status: ${g.status})`).join('\n')}

INTERVENTION EFFECTIVENESS HISTORY:
${Object.entries(effectiveInterventions).map(([int, data]) => 
  `- ${int}: Used ${data.count}x, Effective ${((data.effectiveness/data.count)*100).toFixed(0)}%`
).join('\n')}

RECENT PROGRESS TRAJECTORY:
${recentNotes.slice(0, 5).map(n => 
  `${new Date(n.session_date).toLocaleDateString()}: ${n.progress_rating} - ${n.observations?.substring(0, 100) || 'No notes'}`
).join('\n')}

CLIENT SATISFACTION: ${feedback.length > 0 ? (feedback.reduce((s, f) => s + (f.overall_satisfaction || 0), 0) / feedback.length).toFixed(1) : 'N/A'}/5

Design personalized intervention pathway including:
1. GOAL-SPECIFIC PATHWAYS: Sequence of interventions per goal
2. MILESTONE CHECKPOINTS: Progress indicators and decision points
3. ADAPTIVE STRATEGIES: If/then logic for different progress scenarios
4. INTERVENTION SEQUENCING: Optimal order and frequency
5. RISK MITIGATION: Proactive supports for identified barriers
6. SUCCESS CRITERIA: Measurable outcomes at each phase
7. DYNAMIC ADJUSTMENTS: Triggers for pathway modification

Optimize for evidence-based practice and measurable outcomes.`;

    const aiResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          goal_pathways: {
            type: "array",
            items: {
              type: "object",
              properties: {
                goal: { type: "string" },
                pathway_phases: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      phase_name: { type: "string" },
                      duration_weeks: { type: "number" },
                      interventions: { type: "array", items: { type: "string" } },
                      success_criteria: { type: "array", items: { type: "string" } },
                      checkpoint_actions: { type: "string" }
                    }
                  }
                },
                estimated_completion: { type: "string" },
                confidence_level: { type: "string" }
              }
            }
          },
          adaptive_strategies: {
            type: "array",
            items: {
              type: "object",
              properties: {
                scenario: { type: "string" },
                trigger: { type: "string" },
                response_action: { type: "string" },
                alternative_interventions: { type: "array", items: { type: "string" } }
              }
            }
          },
          milestone_checkpoints: {
            type: "array",
            items: {
              type: "object",
              properties: {
                checkpoint_name: { type: "string" },
                timeframe: { type: "string" },
                evaluation_criteria: { type: "array", items: { type: "string" } },
                decision_options: { type: "array", items: { type: "string" } }
              }
            }
          },
          risk_mitigation_plan: {
            type: "array",
            items: {
              type: "object",
              properties: {
                identified_risk: { type: "string" },
                proactive_support: { type: "string" },
                early_warning_signs: { type: "array", items: { type: "string" } },
                escalation_protocol: { type: "string" }
              }
            }
          },
          recommended_frequency: {
            type: "object",
            properties: {
              session_frequency: { type: "string" },
              review_cadence: { type: "string" },
              pathway_reassessment: { type: "string" }
            }
          }
        }
      }
    });

    return Response.json({
      success: true,
      pathway: aiResponse,
      client_context: {
        goals: goals.length,
        current_risk: riskProfile?.overall_risk_level,
        recent_sessions: recentNotes.length
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