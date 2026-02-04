import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { client_id } = await req.json();

    const [client, goals, caseNotes, appointments, feedback, bsp, interventions] = await Promise.all([
      base44.asServiceRole.entities.Client.get(client_id),
      base44.asServiceRole.entities.ClientGoal.filter({ client_id }),
      base44.asServiceRole.entities.CaseNote.filter({ client_id }),
      base44.asServiceRole.entities.Appointment.filter({ client_id }),
      base44.asServiceRole.entities.ClientFeedback.filter({ client_id }),
      base44.asServiceRole.entities.BehaviourSupportPlan.filter({ client_id, status: 'active' }).then(p => p[0]).catch(() => null),
      base44.asServiceRole.entities.ABCRecord.filter({ client_id })
    ]);

    const completedAppointments = appointments.filter(a => a.status === 'completed');
    const appointmentFrequency = completedAppointments.length > 0 
      ? (completedAppointments.length / 12) // Assuming 12 months of data
      : 0;

    const recentNotes = caseNotes
      .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
      .slice(0, 10);

    const avgSatisfaction = feedback.length > 0
      ? feedback.reduce((sum, f) => sum + (f.overall_satisfaction || 0), 0) / feedback.length
      : 0;

    const goalProgress = goals.map(g => ({
      goal: g.goal_description,
      current_progress: g.current_progress || 0,
      target_date: g.target_date,
      status: g.status,
      time_elapsed: g.created_date ? 
        Math.floor((new Date() - new Date(g.created_date)) / (1000 * 60 * 60 * 24)) : 0
    }));

    const prompt = `
You are analyzing historical client data to predict goal achievement likelihood and recommend optimization strategies.

CLIENT PROFILE:
- Name: ${client.full_name}
- Service Type: ${client.service_type}
- Risk Level: ${client.risk_level || 'medium'}
- NDIS Plan Status: ${client.plan_status}

ENGAGEMENT METRICS:
- Total Appointments: ${completedAppointments.length}
- Appointment Frequency: ${appointmentFrequency.toFixed(1)}/month
- Client Satisfaction: ${avgSatisfaction.toFixed(1)}/5

GOAL PERFORMANCE:
${goalProgress.map(g => `- ${g.goal}: ${g.current_progress}% (${g.time_elapsed} days elapsed, Status: ${g.status})`).join('\n')}

INTERVENTION HISTORY:
${recentNotes.slice(0, 5).map(n => `${new Date(n.created_date).toLocaleDateString()}: ${n.interventions_used || 'Not specified'}`).join('\n')}

ACTIVE BSP: ${bsp ? `Focus: ${bsp.primary_target_behaviors}` : 'None'}

Provide comprehensive predictive analysis:
1. GOAL ACHIEVEMENT PREDICTION: Likelihood of achieving each goal
2. SUCCESS FACTORS: What's working well
3. RISK FACTORS: Barriers to success
4. INTERVENTION EFFECTIVENESS: Which strategies are most impactful
5. OPTIMIZATION RECOMMENDATIONS: Evidence-based adjustments
6. PLAN OUTCOME FORECAST: Overall NDIS plan success prediction

Use evidence-based clinical reasoning and NDIS outcome frameworks.`;

    const aiResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          goal_predictions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                goal: { type: "string" },
                achievement_likelihood: { type: "number" },
                likelihood_rating: { type: "string" },
                confidence_level: { type: "string" },
                key_factors: { type: "array", items: { type: "string" } },
                recommended_adjustments: { type: "array", items: { type: "string" } }
              }
            }
          },
          success_factors: {
            type: "array",
            items: {
              type: "object",
              properties: {
                factor: { type: "string" },
                impact_level: { type: "string" },
                evidence: { type: "string" }
              }
            }
          },
          risk_factors: {
            type: "array",
            items: {
              type: "object",
              properties: {
                factor: { type: "string" },
                severity: { type: "string" },
                mitigation: { type: "string" }
              }
            }
          },
          intervention_effectiveness: {
            type: "array",
            items: {
              type: "object",
              properties: {
                intervention: { type: "string" },
                effectiveness_rating: { type: "string" },
                evidence: { type: "string" },
                recommendation: { type: "string" }
              }
            }
          },
          optimization_recommendations: {
            type: "array",
            items: {
              type: "object",
              properties: {
                priority: { type: "string" },
                recommendation: { type: "string" },
                expected_impact: { type: "string" },
                implementation_steps: { type: "array", items: { type: "string" } }
              }
            }
          },
          plan_outcome_forecast: {
            type: "object",
            properties: {
              overall_success_probability: { type: "number" },
              forecast_confidence: { type: "string" },
              critical_success_factors: { type: "array", items: { type: "string" } },
              timeline_assessment: { type: "string" }
            }
          }
        }
      }
    });

    return Response.json({
      success: true,
      analysis: aiResponse,
      data_summary: {
        goals_analyzed: goals.length,
        notes_reviewed: caseNotes.length,
        appointments_assessed: completedAppointments.length
      },
      analyzed_at: new Date().toISOString()
    });

  } catch (error) {
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});