import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { client_id } = await req.json();

    const [client, incidents, feedback, goals, appointments, ndisPlans, billing, caseNotes] = await Promise.all([
      base44.asServiceRole.entities.Client.get(client_id),
      base44.asServiceRole.entities.Incident.filter({ client_id }),
      base44.asServiceRole.entities.ClientFeedback.filter({ client_id }),
      base44.asServiceRole.entities.ClientGoal.filter({ client_id }),
      base44.asServiceRole.entities.Appointment.filter({ client_id }),
      base44.asServiceRole.entities.NDISPlan.filter({ client_id }),
      base44.asServiceRole.entities.BillingRecord.filter({ client_id }),
      base44.asServiceRole.entities.CaseNote.filter({ client_id })
    ]);

    const last90Days = new Date();
    last90Days.setDate(last90Days.getDate() - 90);

    const recentIncidents = incidents.filter(i => new Date(i.incident_date) >= last90Days);
    const recentFeedback = feedback.filter(f => new Date(f.feedback_date) >= last90Days);
    const recentAppointments = appointments.filter(a => new Date(a.appointment_date) >= last90Days);
    const recentNotes = caseNotes.filter(n => new Date(n.session_date) >= last90Days);

    const missedAppointments = appointments.filter(a => a.status === 'cancelled' || a.status === 'no_show');
    const activePlan = ndisPlans.find(p => p.status === 'active');
    const fundingUtilization = activePlan && activePlan.total_funding
      ? (billing.reduce((sum, b) => sum + (b.amount || 0), 0) / activePlan.total_funding) * 100
      : 0;

    const goalProgress = goals.length > 0
      ? goals.reduce((sum, g) => sum + (g.current_progress || 0), 0) / goals.length
      : 0;

    const avgSatisfaction = recentFeedback.length > 0
      ? recentFeedback.reduce((sum, f) => sum + (f.overall_satisfaction || 0), 0) / recentFeedback.length
      : 0;

    const prompt = `
You are conducting predictive risk analysis for NDIS client management.

CLIENT PROFILE:
- Name: ${client.full_name}
- Service Type: ${client.service_type}
- Current Risk Level: ${client.risk_level || 'medium'}
- Plan Status: ${activePlan?.status || 'none'}

ENGAGEMENT PATTERNS (Last 90 Days):
- Appointments Attended: ${recentAppointments.filter(a => a.status === 'completed').length}
- Missed/Cancelled: ${missedAppointments.length}
- Session Notes: ${recentNotes.length}
- Feedback Submissions: ${recentFeedback.length}

INCIDENT HISTORY:
- Total Incidents: ${incidents.length}
- Recent (90d): ${recentIncidents.length}
- Critical Incidents: ${incidents.filter(i => i.severity === 'critical').length}

GOAL PERFORMANCE:
- Total Goals: ${goals.length}
- Average Progress: ${goalProgress.toFixed(1)}%
- Achieved Goals: ${goals.filter(g => g.status === 'achieved').length}

SATISFACTION METRICS:
- Recent Average: ${avgSatisfaction.toFixed(1)}/5
- Would Recommend: ${recentFeedback.filter(f => f.would_recommend).length}/${recentFeedback.length}

FUNDING UTILIZATION:
- Current Utilization: ${fundingUtilization.toFixed(1)}%
- Plan Expiry: ${activePlan?.end_date || 'Not specified'}

Provide comprehensive predictive risk assessment:
1. OVERALL RISK SCORE (0-100): Likelihood of adverse outcomes
2. DISENGAGEMENT RISK: Probability of service withdrawal
3. ADVERSE OUTCOME RISK: Clinical or safety concerns
4. COMPLIANCE RISK: Plan management issues
5. KEY RISK INDICATORS: Specific concerning patterns
6. RISK TRAJECTORY: Improving/stable/declining
7. INTERVENTION STRATEGIES: Targeted early interventions
8. MONITORING RECOMMENDATIONS: What to track and how often

Optimize for proactive intervention and risk mitigation.`;

    const aiResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          overall_risk_score: { type: "number" },
          risk_level: { type: "string" },
          confidence_level: { type: "string" },
          disengagement_risk: {
            type: "object",
            properties: {
              score: { type: "number" },
              indicators: { type: "array", items: { type: "string" } },
              probability: { type: "string" }
            }
          },
          adverse_outcome_risk: {
            type: "object",
            properties: {
              score: { type: "number" },
              concerns: { type: "array", items: { type: "string" } },
              severity: { type: "string" }
            }
          },
          compliance_risk: {
            type: "object",
            properties: {
              score: { type: "number" },
              gaps: { type: "array", items: { type: "string" } }
            }
          },
          key_risk_indicators: {
            type: "array",
            items: {
              type: "object",
              properties: {
                indicator: { type: "string" },
                current_status: { type: "string" },
                trend: { type: "string" },
                impact: { type: "string" }
              }
            }
          },
          risk_trajectory: { type: "string" },
          intervention_strategies: {
            type: "array",
            items: {
              type: "object",
              properties: {
                strategy: { type: "string" },
                priority: { type: "string" },
                expected_impact: { type: "string" },
                implementation_steps: { type: "array", items: { type: "string" } },
                timeline: { type: "string" }
              }
            }
          },
          monitoring_recommendations: {
            type: "object",
            properties: {
              frequency: { type: "string" },
              key_metrics: { type: "array", items: { type: "string" } },
              escalation_triggers: { type: "array", items: { type: "string" } }
            }
          }
        }
      }
    });

    return Response.json({
      success: true,
      risk_assessment: aiResponse,
      data_summary: {
        recent_incidents: recentIncidents.length,
        engagement_score: recentAppointments.length,
        goal_progress: goalProgress,
        satisfaction: avgSatisfaction
      },
      assessed_at: new Date().toISOString()
    });

  } catch (error) {
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});